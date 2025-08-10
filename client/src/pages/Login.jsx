import React, { useState } from "react";
import api from "../api.js";
import { saveAuth } from "../auth.js";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const hero =
    "./src/img/imagen.png"; // cámbiala si quieres

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { username, password });
      saveAuth(data.token, data.user);
      navigate("/dashboard");
    } catch (err) {
      setError(err?.response?.data?.error || "Error de autenticación");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Imagen superior */}
        <div className="relative h-44 sm:h-56">
          <img src={hero} alt="Inflables" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/20 to-transparent" />
          <div className="absolute bottom-3 left-3 text-white">
            <div className="text-xs uppercase tracking-wider">Inflables</div>
            <div className="text-2xl font-bold leading-none">Miraleny</div>
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={onSubmit} className="p-6 sm:p-7 space-y-4">
          <h2 className="text-xl font-semibold">Iniciar sesión</h2>

          {error && (
            <div className="text-sm rounded-xl border border-rose-200 bg-rose-50 text-rose-700 px-3 py-2">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="block text-sm text-slate-600 mb-1">Usuario</label>
              <input
                autoFocus
                placeholder="Tu usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-4 focus:ring-brand-200 focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Contraseña</label>
              <div className="relative">
                <input
                  placeholder="••••••••"
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 pr-24 rounded-xl border border-slate-300 focus:outline-none focus:ring-4 focus:ring-brand-200 focus:border-brand-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute inset-y-0 right-2 my-1 px-3 rounded-lg text-sm border border-slate-300 hover:bg-slate-50"
                >
                  {showPwd ? "Ocultar" : "Mostrar"}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !username || !password}
            className="w-full px-4 py-2.5 rounded-xl bg-neutral-100 font-bold hover:bg-neutral-200 disabled:opacity-60 disabled:cursor-not-allowed transition"
          >
            {loading ? "Ingresando…" : "Entrar"}
          </button>

          <div className="text-xs text-slate-500 text-center pt-1">
            Created by Mirko Valencia.
          </div>
        </form>
      </div>
    </div>
  );
}
