use reqwest::Client;
use std::time::{SystemTime, UNIX_EPOCH};
use tracing::{warn};

use crate::error::AppError;
use crate::models::alert::OrefResponse;

const ALERTS_URL: &str = "https://www.oref.org.il/WarningMessages/alert/alerts.json";
#[allow(dead_code)]
const HISTORY_URL: &str = "https://www.oref.org.il/warningMessages/alert/History/AlertsHistory.json";
const USER_AGENT: &str = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.100 Safari/537.36";
const REFERER: &str = "https://www.oref.org.il/11226-he/pakar.aspx";

pub fn build_client(proxy_url: Option<&str>) -> Result<Client, AppError> {
    let mut headers = reqwest::header::HeaderMap::new();
    headers.insert("Referer", REFERER.parse().expect("static header"));
    headers.insert("X-Requested-With", "XMLHttpRequest".parse().expect("static header"));
    headers.insert("Pragma", "no-cache".parse().expect("static header"));
    headers.insert("Cache-Control", "max-age=0".parse().expect("static header"));

    let mut builder = Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .user_agent(USER_AGENT)
        .default_headers(headers);

    if let Some(proxy) = proxy_url {
        builder = builder.proxy(reqwest::Proxy::all(proxy)?);
    }

    Ok(builder.build()?)
}

fn strip_bom(bytes: &[u8]) -> &[u8] {
    if bytes.len() >= 3 && bytes[0] == 0xEF && bytes[1] == 0xBB && bytes[2] == 0xBF {
        &bytes[3..]
    } else if bytes.len() >= 2 && bytes[0] == 0xFF && bytes[1] == 0xFE {
        &bytes[2..]
    } else {
        bytes
    }
}

fn clean_response(raw: &[u8]) -> String {
    let stripped = strip_bom(raw);
    let s = if raw.len() >= 2 && raw[0] == 0xFF && raw[1] == 0xFE {
        let u16s: Vec<u16> = stripped.chunks(2)
            .filter_map(|chunk| {
                if chunk.len() == 2 {
                    Some(u16::from_le_bytes([chunk[0], chunk[1]]))
                } else {
                    None
                }
            })
            .collect();
        String::from_utf16_lossy(&u16s)
    } else {
        String::from_utf8_lossy(stripped).into_owned()
    };

    s.replace('\0', "").replace('\u{0A7B}', "")
}

pub async fn fetch_alerts(client: &Client) -> Result<Option<OrefResponse>, AppError> {
    let ts = SystemTime::now().duration_since(UNIX_EPOCH).expect("system clock before epoch").as_secs();
    let url = format!("{}?{}", ALERTS_URL, ts);

    let response = client.get(&url).send().await?;

    if !response.status().is_success() {
        return Err(AppError::Api(format!("HTTP {}", response.status())));
    }

    let bytes = response.bytes().await?;
    let body = clean_response(&bytes);
    let trimmed = body.trim();

    if trimmed.is_empty() {
        return Ok(None);
    }

    if trimmed.contains("/errorpage_adom/") {
        return Err(AppError::Api("API returned error page redirect".into()));
    }

    match serde_json::from_str::<OrefResponse>(trimmed) {
        Ok(resp) => {
            if resp.data.as_ref().map_or(true, |d| d.is_empty()) {
                Ok(None)
            } else {
                Ok(Some(resp))
            }
        }
        Err(e) => {
            warn!("JSON parse failed: {} — body: {}", e, &trimmed[..trimmed.len().min(200)]);
            Err(AppError::Json(e))
        }
    }
}
