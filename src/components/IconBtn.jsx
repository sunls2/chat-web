import "./IconBtn.css"
import React from 'react';
import {Button} from "antd";

function IconBtn(props) {
    const sizeStyle = {width: props.size, height: props.size, ...props.style}
    return (
        <Button
            type="link"
            onClick={props.onClick}
            style={{...sizeStyle, padding: 0, border: 0}}
            icon={<img
                className="icon-btn"
                style={{...sizeStyle}}
                src={props.src} alt={props.src}/>}
        />
    );
}

export default IconBtn;