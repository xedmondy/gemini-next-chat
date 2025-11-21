import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    // 从环境变量中读取 GitHub 配置
    // 记得在 .env.local 中设置 GITHUB_PAT, GITHUB_OWNER, GITHUB_REPO
    const PAT = process.env.GITHUB_PAT;
    const OWNER = process.env.GITHUB_OWNER;
    const REPO = process.env.GITHUB_REPO;

    if (!PAT || !OWNER || !REPO) {
      return NextResponse.json({ error: "GitHub 环境变量未配置" }, { status: 500 });
    }

    const { content, filename } = await req.json();

    // 构造 GitHub API URL
    const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${filename}`;
    
    // GitHub API 需要内容为 Base64 编码
    const encodedContent = Buffer.from(content).toString('base64');

    // 1. 检查文件是否存在以获取 SHA (用于覆盖更新)
    let sha = null;
    const checkRes = await fetch(url, {
      headers: { 
        Authorization: `token ${PAT}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    if (checkRes.ok) {
      const data = await checkRes.json();
      sha = data.sha;
    }

    // 2. 执行上传 (PUT 请求)
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `token ${PAT}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Gemini-Next-Chat-Mod',
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify({
        message: `Sync from Gemini Chat: ${filename}`, // Commit message
        content: encodedContent,
        sha: sha // 如果是更新现有文件，必须提供 sha
      })
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`GitHub API Error: ${res.status} ${errorText}`);
    }

    const data = await res.json();
    return NextResponse.json({ success: true, url: data.content.html_url });

  } catch (error: any) {
    console.error("Upload failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
