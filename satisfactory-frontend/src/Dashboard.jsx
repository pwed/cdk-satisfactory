import { useContext } from 'react'
import { AuthContext } from './AuthContext'
import Card from 'react-bootstrap/Card'
import ServerStatus from './ServerStatus'
import GameStatus from './GameStatus'
import Col from 'react-bootstrap/Col'
import Row from 'react-bootstrap/Row'

export default function Dashboard () {
  const { user } = useContext(AuthContext)
  return (
    user
      ? (
        <>  <Row md={1} lg={2} className='g-4 mt-2'>
          <Col key='server-status'>
            <ServerStatus />
          </Col>
          <Col key='game-status'>
            <GameStatus />
          </Col>
        </Row>
        </>
        )
      : (<>
        <Card className='mt-5 col-12 mx-auto p-3 text-center'>
          <Card.Text>
            Login or signup to control your Satisfactory game server
          </Card.Text>
          <Card.Text>
            Signups will require approval from your admin
          </Card.Text>
        </Card>
      </>)
  )
}
