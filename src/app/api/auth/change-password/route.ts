import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { verifyPassword, hashPassword, SESSION_COOKIE } from "@/lib/auth";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE)?.value;
  if (!session) {
    return Response.json({ error: "未登录" }, { status: 401 });
  }

  const username = session.split(".")[0];
  const { oldPassword, newPassword } = await request.json();

  if (!oldPassword || !newPassword) {
    return Response.json({ error: "请填写旧密码和新密码" }, { status: 400 });
  }

  if (newPassword.length < 4) {
    return Response.json({ error: "新密码至少 4 位" }, { status: 400 });
  }

  const user = await prisma.systemUser.findUnique({ where: { username } });
  if (!user || !verifyPassword(oldPassword, user.passwordHash)) {
    return Response.json({ error: "旧密码错误" }, { status: 401 });
  }

  await prisma.systemUser.update({
    where: { username },
    data: { passwordHash: hashPassword(newPassword) },
  });

  return Response.json({ ok: true });
}
