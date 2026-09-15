import { handlers } from "@/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const fetchCache = "force-no-store";

export const { GET, POST } = handlers;
