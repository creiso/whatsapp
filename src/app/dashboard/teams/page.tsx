"use client";

import { useState, useEffect } from "react";
import styles from "./teams.module.css";

type Team = {
  id: string;
  name: string;
  users: User[];
};

type User = {
  id: string;
  email: string;
  name: string | null;
  role: "ADMIN" | "AGENT";
  createdAt: string;
  Team: Team | null;
  teamId: string | null;
};

type Toast = {
  id: number;
  message: string;
  type: "success" | "error";
};

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Modals state
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  
  // Forms state
  const [teamName, setTeamName] = useState("");
  const [userForm, setUserForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "AGENT",
    teamId: ""
  });
  
  const [submitting, setSubmitting] = useState(false);

  const fetchTeams = async () => {
    try {
      const res = await fetch("/api/teams");
      const data = await res.json();
      if (res.ok) setTeams(data);
    } catch (error) {
      showToast("Erro ao carregar equipes", "error");
    } finally {
      setLoadingTeams(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      if (res.ok) setUsers(data);
    } catch (error) {
      showToast("Erro ao carregar usuários", "error");
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchTeams();
    fetchUsers();
  }, []);

  const showToast = (message: string, type: "success" | "error") => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: teamName }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Equipe criada com sucesso", "success");
        setShowTeamModal(false);
        setTeamName("");
        fetchTeams();
      } else {
        showToast(data.error || "Erro ao criar equipe", "error");
      }
    } catch (error) {
      showToast("Erro ao criar equipe", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTeam = async (id: string, userCount: number) => {
    if (userCount > 0) {
      showToast("Não é possível excluir uma equipe com usuários", "error");
      return;
    }
    
    if (!confirm("Tem certeza que deseja excluir esta equipe?")) return;
    
    try {
      const res = await fetch("/api/teams", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        showToast("Equipe excluída com sucesso", "success");
        fetchTeams();
      } else {
        const data = await res.json();
        showToast(data.error || "Erro ao excluir equipe", "error");
      }
    } catch (error) {
      showToast("Erro ao excluir equipe", "error");
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userForm),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Usuário criado com sucesso", "success");
        setShowUserModal(false);
        setUserForm({ name: "", email: "", password: "", role: "AGENT", teamId: "" });
        fetchUsers();
        fetchTeams(); // Update user counts in teams
      } else {
        showToast(data.error || "Erro ao criar usuário", "error");
      }
    } catch (error) {
      showToast("Erro ao criar usuário", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este usuário?")) return;
    
    try {
      const res = await fetch("/api/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        showToast("Usuário excluído com sucesso", "success");
        fetchUsers();
        fetchTeams(); // Update user counts in teams
      } else {
        const data = await res.json();
        showToast(data.error || "Erro ao excluir usuário", "error");
      }
    } catch (error) {
      showToast("Erro ao excluir usuário", "error");
    }
  };

  return (
    <div className={styles.container}>
      {/* Toast Messages */}
      <div className={styles.toastContainer}>
        {toasts.map(toast => (
          <div key={toast.id} className={`${styles.toast} ${styles[`toast${toast.type.charAt(0).toUpperCase() + toast.type.slice(1)}`]}`}>
            {toast.message}
          </div>
        ))}
      </div>

      {/* Teams Section */}
      <section className={styles.section}>
        <div className={styles.header}>
          <h2>Equipes</h2>
          <button className={styles.addButton} onClick={() => setShowTeamModal(true)}>
            + Nova Equipe
          </button>
        </div>
        
        {loadingTeams ? (
          <div className={styles.loadingSpinner}></div>
        ) : (
          <div className={styles.grid}>
            {teams.length === 0 ? (
              <p style={{ color: "rgba(255,255,255,0.6)" }}>Nenhuma equipe encontrada.</p>
            ) : (
              teams.map(team => (
                <div key={team.id} className={styles.card}>
                  <div className={styles.cardHeader}>
                    <h3 className={styles.cardTitle}>{team.name}</h3>
                    <button 
                      className={styles.deleteBtn}
                      onClick={() => handleDeleteTeam(team.id, team.users?.length || 0)}
                      title="Excluir equipe"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                    </button>
                  </div>
                  <div className={styles.cardStats}>
                    {team.users?.length || 0} membro(s)
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </section>

      {/* Users Section */}
      <section className={styles.section}>
        <div className={styles.header}>
          <h2>Usuários</h2>
          <button className={styles.addButton} onClick={() => setShowUserModal(true)}>
            + Novo Usuário
          </button>
        </div>
        
        {loadingUsers ? (
          <div className={styles.loadingSpinner}></div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>Função</th>
                  <th>Equipe</th>
                  <th>Data de Criação</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", color: "rgba(255,255,255,0.6)" }}>
                      Nenhum usuário encontrado.
                    </td>
                  </tr>
                ) : (
                  users.map(user => (
                    <tr key={user.id}>
                      <td>{user.name || "-"}</td>
                      <td>{user.email}</td>
                      <td>
                        <span className={`${styles.badge} ${user.role === 'ADMIN' ? styles.badgeAdmin : styles.badgeAgent}`}>
                          {user.role}
                        </span>
                      </td>
                      <td>{user.Team?.name || "-"}</td>
                      <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                      <td>
                        <button 
                          className={styles.deleteBtn}
                          onClick={() => handleDeleteUser(user.id)}
                          title="Excluir usuário"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Team Modal */}
      {showTeamModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>Nova Equipe</h3>
            <form onSubmit={handleCreateTeam}>
              <div className={styles.formGroup}>
                <label>Nome da Equipe</label>
                <input 
                  type="text" 
                  className={styles.input} 
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  required
                />
              </div>
              <div className={styles.modalActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setShowTeamModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className={styles.submitBtn} disabled={submitting}>
                  {submitting ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Modal */}
      {showUserModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>Novo Usuário</h3>
            <form onSubmit={handleCreateUser}>
              <div className={styles.formGroup}>
                <label>Nome</label>
                <input 
                  type="text" 
                  className={styles.input} 
                  value={userForm.name}
                  onChange={(e) => setUserForm({...userForm, name: e.target.value})}
                />
              </div>
              <div className={styles.formGroup}>
                <label>E-mail</label>
                <input 
                  type="email" 
                  className={styles.input} 
                  value={userForm.email}
                  onChange={(e) => setUserForm({...userForm, email: e.target.value})}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>Senha</label>
                <input 
                  type="password" 
                  className={styles.input} 
                  value={userForm.password}
                  onChange={(e) => setUserForm({...userForm, password: e.target.value})}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>Função</label>
                <select 
                  className={styles.select}
                  value={userForm.role}
                  onChange={(e) => setUserForm({...userForm, role: e.target.value})}
                >
                  <option value="AGENT">Agent</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Equipe</label>
                <select 
                  className={styles.select}
                  value={userForm.teamId}
                  onChange={(e) => setUserForm({...userForm, teamId: e.target.value})}
                >
                  <option value="">Nenhuma</option>
                  {teams.map(team => (
                    <option key={team.id} value={team.id}>{team.name}</option>
                  ))}
                </select>
              </div>
              <div className={styles.modalActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setShowUserModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className={styles.submitBtn} disabled={submitting}>
                  {submitting ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
