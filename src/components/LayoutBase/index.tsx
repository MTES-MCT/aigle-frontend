import Header from '@/components/Header';
import { useGroupChange } from '@/utils/group-change';
import { getPageTitle } from '@/utils/html';
import { PropsWithChildren } from 'react';
import classes from './index.module.scss';

interface ComponentProps extends PropsWithChildren {
    title?: string;
}

const Component: React.FC<ComponentProps> = ({ children, title }: ComponentProps) => {
    const onGroupChange = useGroupChange();

    return (
        <>
            <title>{getPageTitle(title)}</title>
            <Header onGroupChange={onGroupChange} />
            <div className={classes.content}>{children}</div>
        </>
    );
};

export default Component;
