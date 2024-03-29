import {Alert, Button, Checkbox, Divider, Input, Modal, Select, Typography} from "antd"
import {
    ShopURL,
    UseBing,
    UseBingLabel,
    UseChatGPT, UseChatGPTBrowser, UseChatGPTBrowserLabel, UseChatGPTLabel
} from "../constant"
import React, {useRef, useState} from "react"

const {Text} = Typography

const inputDivStyle = {
    display: "flex", alignItems: "center", gap: "10px", paddingRight: "5%"
}

function Settings(props) {
    const [clientToUse, setClientToUse] = useState(props.config.clientToUse)
    const [jailbreak, setJailbreak] = useState(props.config.jailbreak)
    const [apiKey, setApiKey] = useState(props.config.openaiApiKey)
    const [userToken, setUserToken] = useState(props.config.userToken)
    const resendRetainRef = useRef(null)

    function resetSettings() {
        setClientToUse(props.config.clientToUse)
        setJailbreak(props.config.jailbreak)
        setApiKey(props.config.openaiApiKey)
        setUserToken(props.config.userToken)
        resendRetainRef.current.state.checked = props.config.resendRetain
    }

    function onOk() {
        props.updateConfig({
            ...props.config, clientToUse, jailbreak,
            openaiApiKey: apiKey.trim(),
            userToken: userToken.trim(),
            resendRetain: resendRetainRef.current.state.checked,
        })
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

    function userTokenChange(e) {
        setUserToken(e.target.value)
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
                        {value: UseChatGPTBrowser, label: UseChatGPTBrowserLabel, disabled: true},
                        {value: UseBing, label: UseBingLabel, disabled: true},
                    ]}
                />
                {clientToUse === UseBing ?
                    <Checkbox checked={jailbreak} onChange={jailbreakChange}>Jailbreak</Checkbox> : null}
                {clientToUse === UseChatGPT ?
                    <Button
                        danger={true}
                        type="dashed"
                        href={ShopURL}
                        target="_blank"
                        style={{padding: "4px 10px"}}
                    >购买账号</Button> : null}
            </div>
            {clientToUse === UseChatGPT ?
                <div style={inputDivStyle}>
                    <Text strong={true} style={{flexShrink: 0}}>openaiApiKey:</Text>
                    <Input
                        style={{
                            flex: 1,
                        }}
                        value={apiKey}
                        onChange={apiKeyChange}
                        maxLength={51}
                        allowClear={true}
                        placeholder="sk-xxxxxxxxxxxxxx"/>
                </div> : null
            }
            {clientToUse === UseBing ?
                <div style={inputDivStyle}>
                    <Text strong={true} style={{flexShrink: 0}}>userToken:</Text>
                    <Input
                        style={{
                            flex: 1,
                        }}
                        value={userToken}
                        onChange={userTokenChange}
                        allowClear={true}
                        placeholder="cookies._U"/>
                </div> : null
            }
            <Alert style={{padding: "4px", width: "fit-content", fontSize: "10px"}}
                   message="Switching client will reset the conversation." banner={true} type="warning"/>
            <Divider style={{margin: "5px 0"}}/>
            <Checkbox ref={resendRetainRef}>Retain the content when resending.</Checkbox>
        </div>
    </Modal>)
}

export default React.memo(Settings)