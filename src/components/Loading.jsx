import React from "react";

function Loading() {
    return <div style={{"width": "50px", height: "42px", overflow: "hidden"}}>
        <img src="img/loading.gif" alt="loading" style={{
            width: "150px",
            position: "relative",
            left: "-50px",
            top: "-35px",
        }}/>
    </div>;
}

export default React.memo(Loading)