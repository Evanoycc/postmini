use serde::{Deserialize, Serialize};
use std::fs::File;
use std::io::Write;
use std::time::Instant;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct KvPair {
    pub key: String,
    pub value: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HttpRequestInput {
    pub url: String,
    pub method: String,
    pub headers: Vec<KvPair>,
    pub body_type: String, // "none" | "json" | "formData"
    pub body_text: Option<String>,
    pub form_data: Option<Vec<KvPair>>,
    /// multipart 文件字段：key 为表单名，value 为本地绝对路径
    pub form_files: Option<Vec<KvPair>>,
    /// 若设置，将响应体流式写入该路径（大文件不占用过多内存）
    pub save_response_to: Option<String>,
    pub timeout_ms: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HttpResponseOutput {
    pub ok: bool,
    pub status: u16,
    pub elapsed_ms: u128,
    pub headers: Vec<KvPair>,
    pub body_text: String,
}

const ALLOWED_METHODS: [&str; 4] = ["GET", "POST", "PUT", "DELETE"];

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveTextFileInput {
    pub path: String,
    pub content: String,
}

#[tauri::command]
async fn send_http(input: HttpRequestInput) -> Result<HttpResponseOutput, String> {
    let method = input.method.trim().to_uppercase();
    if !ALLOWED_METHODS.contains(&method.as_str()) {
        return Err(format!(
            "不支持的 method: {}（支持: GET / POST / PUT / DELETE）",
            input.method
        ));
    }
    let parsed_method: http::Method = method
        .parse()
        .map_err(|_| format!("无法解析 method: {}", input.method))?;

    let timeout_ms = input.timeout_ms.unwrap_or(300_000);
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_millis(timeout_ms))
        .build()
        .map_err(|e| format!("创建 HTTP client 失败: {e}"))?;

    let mut req = client.request(parsed_method, input.url.clone());
    for h in input.headers.into_iter() {
        let k = h.key.trim();
        if k.is_empty() {
            continue;
        }
        req = req.header(k, h.value);
    }

    let body_type = input.body_type.as_str();
    match body_type {
        "none" => {}
        "json" => {
            let txt = input.body_text.unwrap_or_default();
            let v: serde_json::Value =
                serde_json::from_str(&txt).map_err(|e| format!("JSON 解析失败: {e}"))?;
            req = req.json(&v);
        }
        "formData" => {
            let mut form = reqwest::multipart::Form::new();
            if let Some(kvs) = input.form_data {
                for kv in kvs.into_iter() {
                    let key = kv.key.trim();
                    if key.is_empty() {
                        continue;
                    }
                    form = form.text(key.to_string(), kv.value);
                }
            }
            if let Some(files) = input.form_files {
                for f in files.into_iter() {
                    let key = f.key.trim();
                    if key.is_empty() {
                        continue;
                    }
                    let path = f.value.trim();
                    if path.is_empty() {
                        continue;
                    }
                    let data =
                        std::fs::read(path).map_err(|e| format!("读取上传文件失败 {path}: {e}"))?;
                    let file_name = std::path::Path::new(path)
                        .file_name()
                        .and_then(|s| s.to_str())
                        .unwrap_or("file");
                    let part = reqwest::multipart::Part::bytes(data).file_name(file_name.to_string());
                    form = form.part(key.to_string(), part);
                }
            }
            req = req.multipart(form);
        }
        other => return Err(format!("不支持的 bodyType: {}", other)),
    }

    let start = Instant::now();
    let mut resp = req
        .send()
        .await
        .map_err(|e| format!("请求发送失败: {e}"))?;

    let status = resp.status().as_u16();
    let ok = resp.status().is_success();
    let headers = resp
        .headers()
        .iter()
        .map(|(k, v)| KvPair {
            key: k.to_string(),
            value: v.to_str().unwrap_or("").to_string(),
        })
        .collect::<Vec<_>>();

    let body_text = if let Some(save_path) = input.save_response_to.filter(|s| !s.trim().is_empty()) {
        let mut file = File::create(&save_path).map_err(|e| format!("创建保存文件失败: {e}"))?;
        let mut total: u64 = 0;
        while let Some(chunk) = resp
            .chunk()
            .await
            .map_err(|e| format!("读取响应流失败: {e}"))?
        {
            file.write_all(&chunk)
                .map_err(|e| format!("写入文件失败: {e}"))?;
            total += chunk.len() as u64;
        }
        format!(
            "响应体已保存到：{}\n共写入 {} 字节。（大文件不加载到界面预览）",
            save_path, total
        )
    } else {
        let bytes = resp
            .bytes()
            .await
            .map_err(|e| format!("读取响应 body 失败: {e}"))?;
        const MAX_PREVIEW: usize = 512 * 1024;
        let s = String::from_utf8_lossy(&bytes);
        if bytes.len() > MAX_PREVIEW {
            format!(
                "（响应较大，仅预览前 {} 字节的 UTF-8 文本；完整内容请使用「保存响应到磁盘」）\n{}",
                MAX_PREVIEW,
                s.chars().take(MAX_PREVIEW).collect::<String>()
            )
        } else {
            s.into_owned()
        }
    };

    let elapsed_ms = start.elapsed().as_millis();

    Ok(HttpResponseOutput {
        ok,
        status,
        elapsed_ms,
        headers,
        body_text,
    })
}

#[tauri::command]
fn save_text_file(input: SaveTextFileInput) -> Result<(), String> {
    let path = input.path.trim();
    if path.is_empty() {
        return Err("保存路径不能为空".to_string());
    }
    std::fs::write(path, input.content).map_err(|e| format!("写入文件失败: {e}"))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![send_http, save_text_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
