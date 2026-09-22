export function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-CL", { dateStyle: "medium" }).format(new Date(value));
}

export function trimText(value: string, length = 150) {
  return value.length > length ? `${value.slice(0, length).trimEnd()}…` : value;
}
