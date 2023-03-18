import {Alert, Button, Checkbox, Divider, Input, Modal, Select, Typography} from "antd";
import {
    UseBing,
    UseBingLabel,
    UseChatGPT, UseChatGPTBrowser, UseChatGPTBrowserLabel,
    UseChatGPTLabel
} from "../constant";
import {useState} from "react";

const {Text} = Typography

export default function Settings(props) {
    const [clientToUse, setClientToUse] = useState(props.config.clientToUse)
    const [jailbreak, setJailbreak] = useState(props.config.jailbreak);
    const [apiKey, setApiKey] = useState(props.config.openaiApiKey);

    function resetSettings() {
        setClientToUse(props.config.clientToUse)
        setJailbreak(props.config.jailbreak)
        setApiKey(props.config.openaiApiKey)
    }

    function onOk() {
        props.updateConfig({...props.config, clientToUse, jailbreak, apiKey})
        props.settingsClose()
    }

    function onCancel() {
        resetSettings()
        props.settingsClose()
    }

    function selectChange(value) {
        setClientToUse(value)
    }

    function jailbreakChange(e) {
        setJailbreak(e.target.checked)
    }

    function apiKeyChange(e) {
        setApiKey(e.target.value)
    }

    return (<Modal
        style={{
            top: "30%",
        }}
        title="Settings"
        open={props.open}
        onCancel={onCancel}
        onOk={onOk}>
        <div style={{display: "flex", flexDirection: "column", gap: "10px"}}>
            <Divider style={{margin: "5px 0"}}/>
            <div style={{display: "flex", alignItems: "center", gap: "10px"}}>
                <Text strong={true}>Client:</Text>
                <Select
                    value={clientToUse}
                    style={{
                        width: "150px",
                    }}
                    onChange={selectChange}
                    options={[
                        {value: UseChatGPT, label: UseChatGPTLabel},
                        {value: UseChatGPTBrowser, label: UseChatGPTBrowserLabel},
                        {value: UseBing, label: UseBingLabel},
                    ]}
                />
                {clientToUse === UseBing ?
                    <Checkbox checked={jailbreak} onChange={jailbreakChange}>Jailbreak</Checkbox> : null}
                {clientToUse === UseChatGPT ?
                    <Button
                        danger={true}
                        type="dashed"
                        href="https://shop.zzzo.eu.org"
                        target="_blank"
                        style={{padding:"4px 10px"}}
                    >购买账号</Button> : null}
            </div>
            {clientToUse === UseChatGPT ?
                <div style={{display: "flex", alignItems: "center", gap: "10px"}}>
                    <Text strong={true}>openaiApiKey:</Text>
                    <Input
                        style={{
                            width: "60%",
                        }}
                        value={apiKey}
                        onChange={apiKeyChange}
                        maxLength={51}
                        allowClear={true}
                        placeholder="sk-xxxxxxxxxxxxxx"/>
                </div> : null
            }
            <Alert style={{padding: "4px", width: "fit-content", fontSize: "10px"}}
                   message="Switching client will reset the conversation." banner={true} type="warning"/>
            <Divider style={{margin: "5px 0"}}/>
        </div>
    </Modal>)
} 