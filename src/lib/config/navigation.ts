import { User, ShieldUser, KeyRound, IdCardLanyard, CreditCard, Database, FolderKanban } from '@lucide/svelte';
import { env } from '$env/dynamic/public';

export interface NavigationItem {
    href: string;
    label: string;
    iconComponent: any;
    external?: boolean;
    description?: string;
}

// Build navigation items dynamically based on environment variables
function buildMyAccountItems(): NavigationItem[] {
    const items: NavigationItem[] = [
        { href: '/user', label: 'Profile', iconComponent: User },
        { href: '/user/consents', label: 'Consents', iconComponent: ShieldUser },
        { href: '/user/consumers', label: 'Consumers', iconComponent: KeyRound },
        { href: '/user/entitlements', label: 'Entitlements', iconComponent: IdCardLanyard },
        { href: '/user/my-data', label: 'My Data', iconComponent: Database, description: 'View my own data.' },
        { href: '/user/api-collections', label: 'My API Collections', iconComponent: FolderKanban, description: 'Manage your API endpoint collections.' }
    ];

    // Only add Subscriptions link if PUBLIC_SUBSCRIPTIONS_URL is set
    if (env.PUBLIC_SUBSCRIPTIONS_URL) {
        items.push({
            href: env.PUBLIC_SUBSCRIPTIONS_URL,
            label: 'Subscriptions',
            iconComponent: CreditCard,
            external: true
        });
    }

    return items;
}

export const myAccountItems = buildMyAccountItems();

export function getActiveMenuItem(pathname: string) {
    const found = myAccountItems.find(item => {
        // Skip external links for active menu detection
        if (item.external) {
            return false;
        }
        if (item.href === '/user' && pathname === '/user') {
            return true;
        }
        return pathname.startsWith(item.href) && item.href !== '/user';
    });
    
    return found || myAccountItems[0]; // fallback to first item
}
