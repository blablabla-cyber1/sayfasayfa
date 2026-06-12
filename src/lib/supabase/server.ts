export function setAll(cookiesToSet: CookieToSet[]) {
  try {
    cookiesToSet.forEach(({ name, value, options }) =>
      cookieStore.set(name, value, options)
    )
  } catch (err) {
    // ...
  }
}
type CookieToSet = {
  name: string
  value: string
  options?: Record<string, any>
}

setAll(cookiesToSet: CookieToSet[]) {
  try {
    cookiesToSet.forEach(({ name, value, options }) =>
      cookieStore.set(name, value, options)
    )
  } catch (err) {
    // handle error
  }
}
