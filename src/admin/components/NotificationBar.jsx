export function NotificationBar({ notification }) {
  if (!notification) {
    return null;
  }

  return (
    <div className={`admin-toast admin-toast-${notification.type || "success"}`}>
      {notification.message}
    </div>
  );
}
