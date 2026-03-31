import { prisma } from "@/lib/db";
import { verifyPassword, createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/auth";

export async function POST(request: Request) {
  const { username, password } = await request.json();

  if (!username || !password) {
    return Response.json({ error: "请输入用户名和密码" }, { status: 400 });
  }

  const user = await prisma.systemUser.findUnique({ where: { username } });
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
}
