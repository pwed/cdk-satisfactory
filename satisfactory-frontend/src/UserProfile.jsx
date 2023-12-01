import { useContext } from 'react'
import { AuthContext } from './AuthContext'
import Form from 'react-bootstrap/Form'
import Button from 'react-bootstrap/Button'
import Stack from 'react-bootstrap/Stack'

export default function UserProfile () {
  const { user, signOut } = useContext(AuthContext)

  return (

    <Form className='mt-2'>
      <Form.Group className='mb-3' controlId='email'>
        <Form.Label>Email address</Form.Label>
        <Form.Control disabled type='email' defaultValue={user.email} />
      </Form.Group>
      <Form.Group className='mb-3' controlId='username'>
        <Form.Label>User Name</Form.Label>
        <Form.Control disabled type='text' defaultValue={user.username} />
      </Form.Group>
      <Form.Group className='mb-3' controlId='password'>
        <Form.Label>Password</Form.Label>
        <Form.Control disabled type='password' />
      </Form.Group>
      <Stack direction='horizontal'>
        <Button disabled variant='primary' type='submit'>Update</Button>
        <Button className='ms-auto' variant='secondary' type='submit'>Sign Out</Button>
      </Stack>
    </Form>
  )
}
