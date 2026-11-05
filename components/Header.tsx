"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { NavItem } from "@/lib/content";

function NavLink({ item, current }: { item: NavItem; current: string }) {
  // Links to other websites (e.g. Sermons on YouTube) open in a new tab.
  if (/^https?:\/\//.test(item.url)) {
    return (
      <a href={item.url} target="_blank" rel="noopener noreferrer">
        {item.title}
        <span className="visually-hidden"> (opens in a new tab)</span>
      </a>
    );
  }
  return (
    <Link href={item.url} aria-current={current === item.url ? "page" : undefined}>
      {item.title}
    </Link>
  );
}

export default function Header({ navigation, churchsuiteLink }: { navigation: NavItem[]; churchsuiteLink: string }) {
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
        {/* Just the logo, not a link: "Home" in the menu goes to the home page. */}
        <div className="logo">
          <Image
            src="/images/logo.png"
            alt="Smithton Church – knowing Jesus, making Jesus known"
            width={600}
            height={123}
            priority
          />
        </div>
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
                  className={[item.children && "has-children", active && "is-active", item.mobileOnly && "nav-mobile-only"]
                    .filter(Boolean)
                    .join(" ")}
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
            <li className="nav-cta">
              <a href={churchsuiteLink} target="_blank" rel="noopener noreferrer">
                My ChurchSuite<span className="visually-hidden"> (opens in a new tab)</span>
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
