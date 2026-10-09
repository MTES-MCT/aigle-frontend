import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// the commune as its suggestion showed it: uuid, name and INSEE code
export interface ParcelSearchCommune {
    value: string;
    label: string;
    description?: string;
}

interface RememberedCommune {
    userUuid: string;
    commune: ParcelSearchCommune;
}

interface ParcelSearchState {
    rememberedCommune?: RememberedCommune;

    rememberCommune: (rememberedCommune?: RememberedCommune) => void;
    getRememberedCommune: (userUuid?: string) => ParcelSearchCommune | null;
}

const useParcelSearch = create<ParcelSearchState>()(
    persist(
        (set, get) => ({
            rememberCommune: (rememberedCommune) => {
                set(() => ({
                    rememberedCommune,
                }));
            },
            getRememberedCommune: (userUuid) => {
                const { rememberedCommune } = get();

                // on a shared browser, an agent must not inherit the previous one's commune
                if (!userUuid || rememberedCommune?.userUuid !== userUuid) {
                    return null;
                }

                return rememberedCommune.commune;
            },
        }),
        {
            name: 'parcel-search',
        },
    ),
);

export { useParcelSearch };
