import BaseLayout from '@/components/layouts/BaseLayout';
import BasePage from "@/components/BasePage"
import { Container, Row, Col } from 'reactstrap';
import { useState, useRef, useEffect } from 'react'
import { useUser } from '@auth0/nextjs-auth0';
import Typed from 'react-typed';
import React from 'react';

const roles = ["Passionate Developer", "Enthusiastic learner", "Team Player", "Spring | React JS | Next JS", "MongoDb | Neo4j | Mysql", "Docker | Openshift | Kuburnetess", "Jenkins | Gitlab"]
const Index = () => {
  const [isFlipping, setIsFlipping] = useState(false);
  const { user, error, isLoading } = useUser();
  const flipInterval = useRef();

  useEffect(() => {
    startAnimation();
    //dispose function, dont call this startAnimation after we navigate away
    return () => { flipInterval.current && clearInterval }
  }, [])

  const startAnimation = () => {
    flipInterval.current = setInterval(() => {
      //this callback has access to the current flipping value
      setIsFlipping((prevFlipping) => !prevFlipping);
    }, 5000)
  }

  return (
    <BaseLayout
      navClass="transparent"
      user={user}
      isLoading={isLoading}
      className={`cover ${isFlipping ? 'cover-orange' : 'cover-blue'}`}>
      <BasePage indexPage>
        <div className="main-section">
          <div className="background-image">
            <img src="/images/background-index.png" />
          </div>
          <Container>
            <Row>
              <Col md="6">
                <div className="hero-section">
                  <div className={`flipper ${isFlipping ? 'isFlipping' : ''}`}>
                    <div className="front">
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
                    <div className="back">
                      <div className="hero-section-content">
                        <h2> Software Developer </h2>
                        <div className="hero-section-content-intro">
                          Have a look at my portfolio and job history.
                        </div>
                      </div>
                      <img className="image" src="/images/section-2.png" />
                      <div className="shadow-custom shadow-custom-orange">
                        <div className="shadow-inner"> </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Col>
              <Col md="6" className="hero-welcome-wrapper">
                <div className="hero-welcome-text">
                  <h1>
                    Welcome To My Portfolio Website.
                    Get informed, collaborate and discover projects I was working on throughout the years!
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
      </BasePage>
    </BaseLayout>
  )
}

export default Index;