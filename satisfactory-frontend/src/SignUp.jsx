import { useState } from 'react'
import { signUp } from './auth'
import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form'
import Toast from 'react-bootstrap/Toast'
import ToastContainer from 'react-bootstrap/ToastContainer'

function SignUp () {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    try {
      await signUp(username, email, password)
      setSuccess(true)
    } catch (err) {
      setError(err.message)
    }
  }

  if (success) {
    window.location = '/'
  }

  return (
    <Form onSubmit={handleSubmit} className='mt-3'>
      <Form.Group className='mb-3'>
        <Form.Label>Username</Form.Label>
        <Form.Control
          type='text'
          placeholder='username'
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
      </Form.Group>
      <Form.Group className='mb-3'>
        <Form.Label>Email Address</Form.Label>
        <Form.Control
          type='email'
          placeholder='example@email.com'
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </Form.Group>

      <Form.Group className='mb-3'>
        <Form.Label>Password</Form.Label>
        <Form.Control
          type='password'
          placeholder='password'
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </Form.Group>
      <Button variant='primary' type='submit'>Sign Up</Button>
      {
                error &&
                  <ToastContainer
                    className='p-3'
                    position='middle-center'
                    style={{ zIndex: 1 }}
                  >
                    <Toast onClose={() => { setError('') }} show={error} delay={3000} autohide>
                      <Toast.Header closeButton={false}>
                        <strong>Error Signing Up</strong>
                      </Toast.Header>
                      <Toast.Body>{error}</Toast.Body>
                    </Toast>
                  </ToastContainer>
            }
    </Form>
  )
}

export default SignUp
