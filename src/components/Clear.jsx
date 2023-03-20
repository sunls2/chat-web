import React from 'react';
import {Button, Popconfirm} from "antd";
import {ClearOutlined} from "@ant-design/icons";

function Clear(props) {
    return (
        <Popconfirm
            title="Reset this conversation?"
            onConfirm={props.onClear}
            okText="Yes"
            cancelText="No"
        >
            <Button shape="round" icon={<ClearOutlined/>}/>
        </Popconfirm>
    );
}

export default React.memo(Clear);