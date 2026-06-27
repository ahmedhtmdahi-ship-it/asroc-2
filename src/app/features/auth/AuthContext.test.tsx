import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router";

// Mutable state the mocked Supabase client reads from, so each test can decide
// whether there's an active session and which profile row comes back.
const state = vi.hoisted(() => ({
  session: null as { user: { id: string } } | null,
  profileRow: null as Record<string, unknown> | null,
}));

vi.mock("@/app/lib/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: state.session } })),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(async () => {}),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(async () => ({
            data: state.profileRow,
            error: state.profileRow ? null : { message: "not found" },
          })),
        })),
      })),
    })),
  },
}));

import { AuthProvider, useAuth } from "./AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";

beforeEach(() => {
  state.session = null;
  state.profileRow = null;
});

function makeProfileRow(role: string) {
  return {
    id: "USER-1",
    username: "user",
    name: "Test User",
    role,
    permissions: [],
    is_active: true,
  };
}

// Small probe component that surfaces auth state into the DOM for assertions.
function AuthProbe() {
  const { isAuthenticated, user, hasRole } = useAuth();
  return (
    <div>
      <span data-testid="authenticated">{String(isAuthenticated)}</span>
      <span data-testid="role">{user?.role ?? "none"}</span>
      <span data-testid="is-employee">{String(hasRole("employee"))}</span>
      <span data-testid="is-manager">{String(hasRole("manager"))}</span>
      <span data-testid="is-emp-or-doc">
        {String(hasRole(["employee", "doctor"]))}
      </span>
    </div>
  );
}

describe("AuthProvider / useAuth", () => {
  it("starts unauthenticated when there is no session", async () => {
    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    );

    await waitFor(() =>
      expect(screen.getByTestId("authenticated")).toHaveTextContent("false")
    );
    expect(screen.getByTestId("role")).toHaveTextContent("none");
    expect(screen.getByTestId("is-employee")).toHaveTextContent("false");
  });

  it("loads the profile and authenticates when a session exists", async () => {
    state.session = { user: { id: "USER-1" } };
    state.profileRow = makeProfileRow("employee");

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    );

    await waitFor(() =>
      expect(screen.getByTestId("authenticated")).toHaveTextContent("true")
    );
    expect(screen.getByTestId("role")).toHaveTextContent("employee");
  });

  it("hasRole matches a single role and rejects others", async () => {
    state.session = { user: { id: "USER-1" } };
    state.profileRow = makeProfileRow("employee");

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    );

    await waitFor(() =>
      expect(screen.getByTestId("role")).toHaveTextContent("employee")
    );
    expect(screen.getByTestId("is-employee")).toHaveTextContent("true");
    expect(screen.getByTestId("is-manager")).toHaveTextContent("false");
  });

  it("hasRole matches when the user's role is in the provided array", async () => {
    state.session = { user: { id: "USER-1" } };
    state.profileRow = makeProfileRow("doctor");

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    );

    await waitFor(() =>
      expect(screen.getByTestId("role")).toHaveTextContent("doctor")
    );
    expect(screen.getByTestId("is-emp-or-doc")).toHaveTextContent("true");
    expect(screen.getByTestId("is-manager")).toHaveTextContent("false");
  });
});

describe("useAuth outside of a provider", () => {
  it("throws a helpful error", () => {
    // Silence the expected React error boundary console noise.
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    function Orphan() {
      useAuth();
      return null;
    }
    expect(() => render(<Orphan />)).toThrow(
      /useAuth must be used inside AuthProvider/
    );
    spy.mockRestore();
  });
});

// Renders a small routing tree guarded by ProtectedRoute and reports where the
// user ends up.
function renderGuarded(roles?: ("employee" | "manager" | "doctor")[]) {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={["/secret"]}>
        <Routes>
          <Route path="/" element={<div>login page</div>} />
          <Route path="/employee" element={<div>employee home</div>} />
          <Route path="/doctor" element={<div>doctor home</div>} />
          <Route
            path="/secret"
            element={
              <ProtectedRoute roles={roles}>
                <div>secret content</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  );
}

describe("ProtectedRoute", () => {
  it("redirects an unauthenticated user to the login page", async () => {
    renderGuarded();
    await waitFor(() =>
      expect(screen.getByText("login page")).toBeInTheDocument()
    );
    expect(screen.queryByText("secret content")).not.toBeInTheDocument();
  });

  it("renders children when the user is authenticated and no roles are required", async () => {
    state.session = { user: { id: "USER-1" } };
    state.profileRow = makeProfileRow("employee");

    renderGuarded();
    await waitFor(() =>
      expect(screen.getByText("secret content")).toBeInTheDocument()
    );
  });

  it("renders children when the user's role is allowed", async () => {
    state.session = { user: { id: "USER-1" } };
    state.profileRow = makeProfileRow("doctor");

    renderGuarded(["doctor"]);
    await waitFor(() =>
      expect(screen.getByText("secret content")).toBeInTheDocument()
    );
  });

  it("redirects to the user's own home when their role is not allowed", async () => {
    state.session = { user: { id: "USER-1" } };
    state.profileRow = makeProfileRow("employee");

    renderGuarded(["doctor"]);
    await waitFor(() =>
      expect(screen.getByText("employee home")).toBeInTheDocument()
    );
    expect(screen.queryByText("secret content")).not.toBeInTheDocument();
  });
});
