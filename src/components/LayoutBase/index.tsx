import Header from '@/components/Header';
import { PropsWithChildren } from 'react';
import classes from './index.module.scss';

const Component: React.FC<PropsWithChildren> = ({ children }: PropsWithChildren) => {
    return (
        <>
            <Header />
            <div className={classes.content}>{children}</div>
        </>
    );
};

export default Component;
