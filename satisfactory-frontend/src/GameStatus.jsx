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
    Controller,
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

export default function GameStatus() {
    const isPageVisible = usePageVisibility();
    const [isPollingEnabled, setIsPollingEnabled] = useState(true);
    const [error, setError] = useState("");
    const timerIdRef = useRef(null);
    const [responseBody, setServerStatus] = useState({
        Status: "",
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
                const response = await fetch(`https://api.admin.satisfactory.pwed.me/satisfactory`, {
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




    // Redirect to the profile page
    return (
        <Card border="secondary">
            <Card.Header>
                <Stack direction="horizontal" gap={3}>
                    <strong><Controller /> Manage Game</strong>
                    {/* <Button variant="info">GET</Button> */}
                    <Button className="ms-auto" onClick={apiCall("/satisfactory/stop", "GET", false)} hidden={responseBody.Status != "running"} title="Stop Dedicated Server" variant="danger"><StopCircle /></Button>
                    <Button className="ms-auto" onClick={apiCall("/satisfactory/start", "GET", false)} hidden={responseBody.Status != "dead"} title="Start Dedicated Server On" variant="success"><PlayCircle /></Button>
                    <Button onClick={apiCall("/satisfactory/restart", "GET", false)} hidden={!responseBody.Status} title="Restart Dedicated Server" variant="warning"><ArrowClockwise /></Button>
                    <Button onClick={apiCall("/satisfactory/update", "GET", false)} hidden={!responseBody.Status} title="Update Server" variant="success"><FileArrowDown /></Button>
                </Stack></Card.Header>
            <Card.Body>
                <Card.Subtitle className="mb-2">Game Status</Card.Subtitle>
                <Card.Text> <Power /> - {responseBody.Status ? responseBody.Status.charAt(0).toUpperCase() + responseBody.Status.slice(1) : "Offline"}</Card.Text>
                {/* {error && <p>{error}</p>} */}
            </Card.Body>
        </Card>
    )
}