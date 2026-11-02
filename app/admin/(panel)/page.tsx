import type { Metadata } from "next";

export const metadata: Metadata = { title: "Dashboard" };

// The admin home page. New tools get a card in the grid below.
export default function AdminDashboard() {
  return (
    <>
      <h1>Dashboard</h1>
      <p className="admin-intro">Welcome to the Smithton Church admin panel.</p>
      <div className="admin-tools">
        <div className="admin-tool admin-tool-empty">
          <h2>More tools coming soon</h2>
          <p>Features for managing the website will appear here.</p>
        </div>
      </div>
    </>
  );
}
