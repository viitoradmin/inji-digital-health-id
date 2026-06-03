import React from "react";
import {Oval} from "react-loader-spinner";

export const SpinningLoader: React.FC = () => {
    return <React.Fragment>
        <div data-testid="SpinningLoader-Container" className={"flex justify-center items-center"}>
            <Oval
                visible={true}
                height="80"
                width="80"
                color={'var(--iw-color-spinningLoaderPrimary)'}
                secondaryColor={'var(--iw-color-spinningLoaderSecondary)'}
                ariaLabel="oval-loading"
                wrapperStyle={{}}
                wrapperClass=""
                strokeWidth={3}
            />
        </div>
    </React.Fragment>

}
