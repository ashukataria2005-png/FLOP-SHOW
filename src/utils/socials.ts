export interface SocialLinks {
  telegram: string;
  instagram: string;
  facebook: string;
  youtube: string;
  twitter: string;
  linkedin: string;
}

export const DEFAULT_SOCIALS: SocialLinks = {
  telegram: 'https://t.me/flopshow_official',
  instagram: 'https://instagram.com/flopshow_official',
  facebook: 'https://facebook.com/flopshow.official',
  youtube: 'https://youtube.com/@flopshow',
  twitter: 'https://x.com/flopshow_app',
  linkedin: 'https://linkedin.com/company/flopshow'
};

export function getSavedSocials(): SocialLinks {
  try {
    const raw = localStorage.getItem('flopshow_social_links');
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_SOCIALS, ...parsed };
    }
  } catch {}
  return DEFAULT_SOCIALS;
}

export function saveSocials(links: SocialLinks): void {
  try {
    localStorage.setItem('flopshow_social_links', JSON.stringify(links));
    if (links.telegram) {
      localStorage.setItem('flopshow_telegram_link', links.telegram);
    }
    window.dispatchEvent(new CustomEvent('flopshow_socials_updated', { detail: links }));
    window.dispatchEvent(new Event('storage'));
  } catch {}
}
