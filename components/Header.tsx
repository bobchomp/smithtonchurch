"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { NavItem } from "@/lib/content";

function NavLink({ item, current }: { item: NavItem; current: string }) {
  if (/^https?:\/\//.test(item.url)) return <a href={item.url}>{item.title}</a>;
  return (
    <Link href={item.url} aria-current={current === item.url ? "page" : undefined}>
      {item.title}
    </Link>
  );
}

export default function Header({ navigation }: { navigation: NavItem[] }) {
  const pathname = usePathname();
  const current = pathname.endsWith("/") ? pathname : `${pathname}/`;
  const [menuOpen, setMenuOpen] = useState(false);
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);

  // Close the mobile menu whenever the page changes.
  useEffect(() => {
    setMenuOpen(false);
    setOpenSubmenu(null);
  }, [pathname]);

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link className="logo" href="/">
          <Image
            src="/images/logo.png"
            alt="Smithton Church – knowing Jesus, making Jesus known"
            width={600}
            height={123}
            priority
          />
        </Link>
        <button
          className="menu-toggle"
          type="button"
          aria-expanded={menuOpen}
          aria-controls="main-menu"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <span className="menu-toggle-bars" aria-hidden="true" />
          <span className="menu-toggle-label">Menu</span>
        </button>
        <nav className={`main-nav${menuOpen ? " is-open" : ""}`} id="main-menu" aria-label="Main">
          <ul>
            {navigation.map((item) => {
              const active =
                current === item.url || (item.children ?? []).some((child) => child.url === current);
              const submenuOpen = openSubmenu === item.title;
              return (
                <li
                  key={item.title}
                  className={[item.children && "has-children", active && "is-active"].filter(Boolean).join(" ")}
                >
                  <NavLink item={item} current={current} />
                  {item.children && (
                    <>
                      <button
                        className="submenu-toggle"
                        type="button"
                        aria-expanded={submenuOpen}
                        aria-label={`Show ${item.title} pages`}
                        onClick={() => setOpenSubmenu(submenuOpen ? null : item.title)}
                      />
                      <ul className={`submenu${submenuOpen ? " is-open" : ""}`}>
                        {item.children.map((child) => (
                          <li key={child.url}>
                            <NavLink item={child} current={current} />
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
