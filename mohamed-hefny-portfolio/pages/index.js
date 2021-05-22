import BaseLayout from '@/components/layouts/BaseLayout';
import { Container, Row, Col } from 'reactstrap';
import { useUser } from '@auth0/nextjs-auth0';
import Typed from 'react-typed';
import React from 'react';

const roles = ["Passionate Developer", "Enthusiastic learner", "Team Player", "Spring | React JS | Next JS", "MongoDb | Neo4j | Mysql", "Docker | Openshift | Kuburnetess", "Jenkins | Gitlab"]
const Index = () =>{
  const { user, error, isLoading } = useUser();
    return (
      <BaseLayout 
      user = {user}
      isLoading = {isLoading}
      className="cover">
        <div className="main-section">
          <div className="background-image">
            <img src="/images/background-index.png" />
          </div>
          <Container>
            <Row>
              <Col md="6">
                <div className="hero-section">
                  <div className={`flipper`}>
                    <div className="back">
                      <div className="hero-section-content">
                        <h2> Software Developer </h2>
                        <div className="hero-section-content-intro">
                          Have a look at my portfolio and job history.
                        </div>
                      </div>
                      <img className="image" src="/images/section-1.png" />
                      <div className="shadow-custom">
                        <div className="shadow-inner"> </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Col>
              <Col md="6" className="hero-welcome-wrapper">
                <div className="hero-welcome-text">
                  <h1>
                    Welcome to the portfolio website of Mohamed Hefny.
                    Get informed, collaborate and discover projects I was working on through the years!
                  </h1>
                </div>
                <Typed
                  loop
                  typeSpeed={20}
                  backSpeed={40}
                  strings={roles}
                  backDelay={1000}
                  loopCount={0}
                  showCursor
                  className="self-typed"
                  cursorChar="|"  
                />
                <div className="hero-welcome-bio">
                  <h1>
                    Let's take a look on my work.
                  </h1>
                </div>
              </Col>
            </Row>
          </Container>
        </div>
      </BaseLayout>
    )
}

export default Index;