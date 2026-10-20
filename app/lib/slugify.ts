// 제목 텍스트 → 앵커 id. 한글을 포함한 글자·숫자는 그대로 두고, 공백은 '-'로, 그 외 문장부호는 제거한다.
export function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-')
}
