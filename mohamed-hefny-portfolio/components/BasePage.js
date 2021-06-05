import { Container } from "reactstrap"
import 'react-vertical-timeline-component/style.min.css';
import Head from 'next/head';
import { useRouter } from 'next/router'
const BasePage = props => {
    const router = useRouter();
    const { canonicalPath, indexPage, className = "", header, title = "Portfolio - Mohamed Hefny",
        metaDescription = "My name is Mohamed Hefny. I am an enthusiastic software engineer. Throughout my career, I have acquired advanced technical knowledge and the ability to explain programming topics clearly and in detail to a broad audience. I have a keen interest in being up to date with the latest technologies used to improve a developer's experience.",
        children } = props;
    const pageType = indexPage ? 'index-page' : 'base-page'
    return (
        <>
            <Head>
                <title name="title" key="title">{title}</title>
                <meta name="viewport" content="initial-scale=1.0, width = device-width" />
                <meta name="description" key="description" content={metaDescription} />
                <meta property="og:title" key="og:title" content={title} />
                <meta property="og:locale" key="og:locale" content="en_US" />
                <meta property="og:url" key="og:url" content={`${process.env.BASE_URL} ${router.asPath}`} />
                <meta property="og:type" key="og:type" content="website" />
                <meta property="og:image" key="og:image" content={`${process.env.BASE_URL}/images/section-1.png}`} />
                <meta property="og:description" key="og:desciption" content={metaDescription} />
                <link rel="canonical" href={`${process.env.BASE_URL}${canonicalPath ? canonicalPath : router.asPath}`} />
                <link rel="icon" type="image/x-icon" href = "/images/favicon.ico"/>
                <link href="https://fonts.googleapis.com/css?family=Montserrat:400,700" rel = "stylesheet"/>
            </Head>
            <div className={`${pageType} ${className}`}>
                <Container>
                    {
                        header &&
                        <div className="page-header">
                            <h1 className="page-header-title">{header}</h1>
                        </div>
                    }
                    {children}
                </Container>
            </div>
        </>
    )

}
export default BasePage;