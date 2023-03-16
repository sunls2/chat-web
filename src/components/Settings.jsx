import {Checkbox, Modal, Select, Typography} from "antd";
import {UseBing, UseChatGPT, UseChatGPTBrowser} from "../constant";
import {useRef, useState} from "react";

export default function Settings(props) {
    const [clientToUse, setClientToUse] = useState(props.config.clientToUse)
    const [jailbreak, setJailbreak] = useState(props.config.jailbreak);

    function onOk() {
        props.settingsClose()
    }

    function onCancel() {
        setClientToUse(props.config.clientToUse)
        setJailbreak(props.config.jailbreak)
        props.settingsClose()
    }

    function selectChange(value) {
        setClientToUse(value)
    }

    function jailbreakChange(value) {
        setJailbreak(value)
    }

    return (<Modal
        style={{
            top: "30%",
        }}
        title="Settings"
        open={props.open}
        onCancel={onCancel}
        onOk={onOk}>
        <div style={{display: "flex", alignItems: "center", gap: "10px"}}>
            <Typography.Text strong={true}>Client Use:</Typography.Text>
            <Select
                value={clientToUse}
                style={{
                    width: "150px",
                }}
                onChange={selectChange}
                options={[
                    {value: UseChatGPT, label: "ChatGPT"},
                    {value: UseChatGPTBrowser, label: "ChatGPTBrowser"},
                    {value: UseBing, label: "Bing"},
                ]}
            />
            {clientToUse === UseBing ?
                <Checkbox checked={jailbreak} onChange={jailbreakChange}>Jailbreak</Checkbox> : null}
        </div>
    </Modal>)
}