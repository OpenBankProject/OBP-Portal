import { User, ShieldUser, KeyRound } from '@lucide/svelte';

export const myAccountItems = [
    { href: '/user', label: 'Profile', iconComponent: User },
    { href: '/user/consents', label: 'Consents', iconComponent: ShieldUser },
    { href: '/user/consumers', label: 'Consumers', iconComponent: KeyRound }
];

export function getActiveMenuItem(pathname: string) {
    const found = myAccountItems.find(item => {
        if (item.href === '/user' && pathname === '/user') {
            return true;
        }
        return pathname.startsWith(item.href) && item.href !== '/user';
    });
    
    return found || myAccountItems[0]; // fallback to first item
}