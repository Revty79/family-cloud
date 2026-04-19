self.addEventListener("push", (event) => {
  if (!event.data) {
    return;
  }

  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = {
      body: event.data.text(),
    };
  }

  const title = typeof data.title === "string" ? data.title : "Family Cloud";
  const body =
    typeof data.body === "string" ? data.body : "There is a new family update.";
  const url = typeof data.url === "string" ? data.url : "/dashboard";
  const tag = typeof data.tag === "string" ? data.tag : "family-cloud-update";
  const icon = typeof data.icon === "string" ? data.icon : "/icon-192.png";
  const badge = typeof data.badge === "string" ? data.badge : "/icon-192.png";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      tag,
      data: {
        url,
      },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetPath =
    event.notification &&
    event.notification.data &&
    typeof event.notification.data.url === "string"
      ? event.notification.data.url
      : "/dashboard";
  const targetUrl = new URL(targetPath, self.location.origin).toString();

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(
      (clientList) => {
        for (const client of clientList) {
          if (client.url === targetUrl && "focus" in client) {
            return client.focus();
          }
        }

        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }

        return undefined;
      },
    ),
  );
});
