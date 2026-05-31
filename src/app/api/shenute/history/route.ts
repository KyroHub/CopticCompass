import {
  handleShenuteHistoryDelete,
  handleShenuteHistoryGet,
  handleShenuteHistoryPost,
} from "@/features/shenute/lib/server/historyRoute";

export function GET(request: Request) {
  return handleShenuteHistoryGet(request);
}

export function POST(request: Request) {
  return handleShenuteHistoryPost(request);
}

export function DELETE(request: Request) {
  return handleShenuteHistoryDelete(request);
}
