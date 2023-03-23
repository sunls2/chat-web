import "./Title.css"
import React from "react"
import {UseBing, UseMap} from "../constant"
import {Button, Typography} from "antd"
import {SettingOutlined} from "@ant-design/icons"

const Text = Typography

function Title(props) {
    return (
        <div style={{display: "flex", alignItems: "center", justifyContent: "space-between"}}>
            <Text strong="true">{UseMap.get(props.config.clientToUse)}</Text>
            {props.config.clientToUse === UseBing && props.config.jailbreak ?
                <img className="jailbreak-img" src="img/jailbreak.png" alt="jailbreak"/> : null}
            <div style={{flexGrow: 1, visibility: "hidden"}}/>
            <Button
                type="link" size="large" icon={<SettingOutlined/>}
                onClick={() => props.setModalOpen(true)}/>
        </div>
    )
}

export default React.memo(Title)