import React from 'react';

import classes from './index.module.scss';
import { DEFAULT_ROUTE, ROLES_NAMES_MAP } from '@/utils/constants';
import { Avatar, Divider, Menu, NavLink } from '@mantine/core';
import { useAuth } from '@/utils/auth';
import { IconLogout } from '@tabler/icons-react';
import { useLocation } from 'react-router-dom';

const Component: React.FC = () => {
  const { userMe, logout } = useAuth();
  const { pathname } = useLocation();
  
  return (
    <header className={classes.container}>
      <div className="navigation-items">
        <NavLink href={DEFAULT_ROUTE} label="Aigle" />

        <Divider
          className="navigation-items-divider"
          orientation="vertical"
        />

        <NavLink href="/map" label="Carte" active={pathname.includes('/map')} />
        {userMe?.userRole &&
        ['ADMIN', 'SUPER_ADMIN'].includes(userMe.userRole) ? (
          <NavLink href="/admin" label="Admin" active={pathname.includes('/admin')} />
        ) : null}
      </div>

      <Menu>
        <Menu.Target>
          <Avatar
            className={classes['avatar-button']}
            component="button"
            disabled={!userMe}
          />
        </Menu.Target>

        {userMe ? (
          <Menu.Dropdown className={classes.menu}>
            <Menu.Label className={classes['menu-email']}>
              {userMe.email}
            </Menu.Label>
            <Menu.Label className={classes['menu-role']}>
              {ROLES_NAMES_MAP[userMe.userRole]}
            </Menu.Label>
            <Menu.Item leftSection={<IconLogout />} onClick={() => logout()}>
              Déconnexion
            </Menu.Item>
          </Menu.Dropdown>
        ) : null}
      </Menu>
    </header>
  );
};

export default Component;
