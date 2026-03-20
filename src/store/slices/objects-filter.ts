import { ObjectsFilter } from '@/models/detection-filter';
import { setObjectFilters } from '@/utils/objects-filter';
import { create } from 'zustand';

interface ObjectsFilterState {
    objectsFilter?: ObjectsFilter;

    updateObjectsFilter: (objectsFilter: ObjectsFilter) => void;
}

const useObjectsFilter = create<ObjectsFilterState>()((set) => ({
    updateObjectsFilter: (objectsFilter: ObjectsFilter) => {
        set((state) => {
            const objectsFilterUpdated = {
                ...state.objectsFilter,
                ...objectsFilter,
            };
            setObjectFilters(objectsFilterUpdated);

            return {
                objectsFilter: objectsFilterUpdated,
            };
        });
    },
}));

export { useObjectsFilter };
