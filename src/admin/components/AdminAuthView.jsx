import { useState } from "react";

export function AdminAuthView({
  adminExists,
  error,
  onCreateAdmin,
  onLogin,
  pending,
}) {
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [registerForm, setRegisterForm] = useState({
    username: "",
    password: "",
    confirmPassword: "",
  });

  return (
    <div className="admin-auth-shell">
      <div className="admin-auth-card">
        <p className="admin-kicker">Administration</p>
        <h1>{adminExists ? "Connexion administrateur" : "Créer le premier compte admin"}</h1>
        <p className="admin-auth-copy">
          {adminExists
            ? "Accédez à la gestion des GPU, modèles LLM et benchmarks détaillés."
            : "Le projet n’a pas encore de compte admin. Créez-le avant d’utiliser le back-office."}
        </p>

        {adminExists ? (
          <form
            className="admin-auth-form"
            onSubmit={async (event) => {
              event.preventDefault();
              await onLogin(loginForm.username, loginForm.password);
            }}
          >
            <label>
              <span>Nom d’utilisateur</span>
              <input
                autoComplete="username"
                name="username"
                required
                type="text"
                value={loginForm.username}
                onChange={(event) =>
                  setLoginForm((currentForm) => ({
                    ...currentForm,
                    username: event.target.value,
                  }))
                }
              />
            </label>

            <label>
              <span>Mot de passe</span>
              <input
                autoComplete="current-password"
                name="password"
                required
                type="password"
                value={loginForm.password}
                onChange={(event) =>
                  setLoginForm((currentForm) => ({
                    ...currentForm,
                    password: event.target.value,
                  }))
                }
              />
            </label>

            {error ? <p className="admin-error-text">{error}</p> : null}

            <button className="admin-btn admin-btn-primary" disabled={pending} type="submit">
              {pending ? "Connexion..." : "Connexion"}
            </button>
          </form>
        ) : (
          <form
            className="admin-auth-form"
            onSubmit={async (event) => {
              event.preventDefault();
              await onCreateAdmin(
                registerForm.username,
                registerForm.password,
                registerForm.confirmPassword
              );
            }}
          >
            <label>
              <span>Nom d’utilisateur</span>
              <input
                autoComplete="username"
                name="username"
                required
                type="text"
                value={registerForm.username}
                onChange={(event) =>
                  setRegisterForm((currentForm) => ({
                    ...currentForm,
                    username: event.target.value,
                  }))
                }
              />
            </label>

            <label>
              <span>Mot de passe</span>
              <input
                autoComplete="new-password"
                name="password"
                required
                type="password"
                value={registerForm.password}
                onChange={(event) =>
                  setRegisterForm((currentForm) => ({
                    ...currentForm,
                    password: event.target.value,
                  }))
                }
              />
            </label>

            <label>
              <span>Confirmer le mot de passe</span>
              <input
                autoComplete="new-password"
                name="confirmPassword"
                required
                type="password"
                value={registerForm.confirmPassword}
                onChange={(event) =>
                  setRegisterForm((currentForm) => ({
                    ...currentForm,
                    confirmPassword: event.target.value,
                  }))
                }
              />
            </label>

            {error ? <p className="admin-error-text">{error}</p> : null}

            <button className="admin-btn admin-btn-primary" disabled={pending} type="submit">
              {pending ? "Création..." : "Créer le compte"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
