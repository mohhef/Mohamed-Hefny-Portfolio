import Link from 'next/link'

const Header = () => {
    return (
        <>
            <Link href="/">
                <a>
                    Home
            </a>
            </Link>
            <Link href="/about">
                <a>
                    About
            </a>
            </Link>
            <Link href="/portfolios">
                <a>
                    Portfolios
            </a>
            </Link>
            <Link href="/blogs">
                <a>
                    Home
            </a>
            </Link>
            <Link href="/cv">
                <a>
                    Cv
            </a>
            </Link>
        </>
    )
}

export default Header;