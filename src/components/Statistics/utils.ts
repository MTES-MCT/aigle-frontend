export const valueFormatter = (value: any) => {
    if (typeof value !== 'number') {
        return value;
    }

    return new Intl.NumberFormat('fr-FR').format(value);
};
