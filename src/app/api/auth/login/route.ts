import { prisma } from "@/lib/db";
import { verifyPassword, hashPassword, createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/auth";

const DEFAULT_USERNAME = "8888";
const DEFAULT_PASSWORD = "8008";

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return Response.json({ error: "请输入用户名和密码" }, { status: 400 });
    }

    let user;
    try {
      user = await prisma.systemUser.findUnique({ where: { username } });
    } catch {
      // Table might not exist yet — auto-create default user
      try {
        await prisma.systemUser.create({
          data: { username: DEFAULT_USERNAME, passwordHash: hashPassword(DEFAULT_PASSWORD) },
        });
        user = await prisma.systemUser.findUnique({ where: { username } });
      } catch {
        // Table truly doesn't exist, hint to run db push
        return Response.json(
          { error: "数据库未初始化，请先运行 prisma db push 和 seed" },
          { status: 500 }
        );
      }
    }

    if (!user || !verifyPassword(password, user.passwordHash)) {
      return Response.json({ error: "用户名或密码错误" }, { status: 401 });
    }

    const token = createSessionToken(username);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE}`,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "登录服务异常" },
      { status: 500 }
    );
  }
}
