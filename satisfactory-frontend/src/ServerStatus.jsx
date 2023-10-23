import { useEffect, useRef, useState } from "react"
import { getSession } from "./auth";
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Stack from 'react-bootstrap/Stack';
import Badge from 'react-bootstrap/Badge';
import {
    ArrowClockwise,
    FileArrowDown,
    Globe,
    HddRack,
    PlayCircle,
    Plus,
    Power,
    StopCircle,
} from 'react-bootstrap-icons';

function usePageVisibility() {
    const [isPageVisible, setIsPageVisible] = useState(!document.hidden);

    useEffect(() => {
        const handleVisibilityChange = () => {
            setIsPageVisible(!document.hidden);
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    return isPageVisible;
}

export default function ServerStatus() {
    const isPageVisible = usePageVisibility();
    const [isPollingEnabled, setIsPollingEnabled] = useState(true);
    const [error, setError] = useState("");
    const timerIdRef = useRef(null);
    const [responseBody, setServerStatus] = useState({
        DNS: "",
        State: "",
        Ports: [],
        AllowedIps: [],
    });

    const apiCall = (path, method = "GET", async = false) => {
        return async () => {
            const session = await getSession()
            setError("")

            let headers = {
                Authorization: `Bearer ${session.idToken.jwtToken}`,
            }

            if (async) {
                headers["InvocationType"] = "Event"
            }

            try {
                await fetch(`https://api.admin.satisfactory.pwed.me${path}`, {
                    method: method,
                    headers,
                })
            } catch (err) {
                setError(err.message)
            }
            setIsPollingEnabled(false)
            setIsPollingEnabled(true)
        }
    }

    useEffect(() => {
        const pollingCallback = async (e) => {
            const session = await getSession()
            setError("")

            let headers = {
                Authorization: `Bearer ${session.idToken.jwtToken}`,
            }

            try {
                const response = await fetch(`https://api.admin.satisfactory.pwed.me/server`, {
                    method: "GET",
                    headers,
                })
                setServerStatus(await response.json())
                console.log(responseBody)
            } catch (err) {
                setError(err.message)
            }
        }

        const startPolling = () => {
            timerIdRef.current = setInterval(pollingCallback, 30000)
            console.log(timerIdRef, "Starting Polling")
        }

        const stopPolling = () => {
            clearInterval(timerIdRef.current);
            console.log(timerIdRef, "Stopping Polling")
        };

        if (isPageVisible && isPollingEnabled) {
            startPolling();
            pollingCallback()
        } else {
            stopPolling();
        }


    }, [isPageVisible, isPollingEnabled])



    const addIp = async (e) => {
        const session = await getSession()
        setError("")

        let headers = {
            Authorization: `Bearer ${session.idToken.jwtToken}`,
        }

        try {
            const response = await fetch(`https://api.admin.satisfactory.pwed.me/network/prefix-list/add`, {
                method: "PUT",
                headers,
            })
            // setServerStatus(await response.json())
            console.log(responseBody)
        } catch (err) {
            setError(err.message)
        }
    }
    // Redirect to the profile page
    return (
        <Card border="secondary" className="">
            <Card.Header><HddRack/> Manage Server</Card.Header>
            <Stack direction="horizontal" className="mt-2 mx-2" gap={3}>
                {/* <Button variant="info">GET</Button> */}
                <Button onClick={apiCall("/server/stop", "GET", false)} hidden={responseBody.State != "running"} title="Power Off" variant="danger"><StopCircle /></Button>
                <Button onClick={apiCall("/server/start", "GET", false)} hidden={responseBody.State == "running"} title="Power On" variant="success"><PlayCircle /></Button>
                <Button onClick={apiCall("/server/restart", "GET", false)} disabled={responseBody.State != "running"} title="Restart" variant="warning"><ArrowClockwise /></Button>
                <Button onClick={apiCall("/server/update", "GET", false)} disabled={responseBody.State != "running"} title="Update Server" variant="success"><FileArrowDown /></Button>
            </Stack>
            <Card.Body>
                <Card.Subtitle className="mb-2">Server Status</Card.Subtitle>
                <Card.Text> <Globe /> - {responseBody.DNS}</Card.Text>

                <Card.Text>
                    <Power /> - {responseBody.State.charAt(0).toUpperCase() + responseBody.State.slice(1)}
                </Card.Text>
                <Card.Text>Ports </Card.Text><Stack direction="horizontal" gap={3}>{
                    responseBody.Ports.map((e) => { return <Badge key={e}>{e}</Badge> })
                }</Stack>
                <Card.Text>AllowedIps <Button variant="link" onClick={addIp}><Plus /></Button></Card.Text>
                <Stack direction="horizontal" gap={3}>{
                    responseBody.AllowedIps.map((e) => { return <Badge key={e.Cidr.split("/")[0]}>{e.Cidr.split("/")[0]}</Badge> })
                }</Stack>
                {/* {error && <p>{error}</p>} */}
            </Card.Body>
        </Card>
    )
}