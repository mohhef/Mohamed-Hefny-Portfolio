import 'bootstrap/dist/css/bootstrap.min.css'
import { UserProvider } from '@auth0/nextjs-auth0';
import "react-datepicker/dist/react-datepicker.css";
import 'react-vertical-timeline-component/style.min.css';
import '@/styles/main.scss'

function MyApp({ Component, pageProps }) {
  return (
    <UserProvider>
      <Component {...pageProps} />
    </UserProvider>
  )
}

export default MyApp
