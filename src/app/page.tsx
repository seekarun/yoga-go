'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Home() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const coursesRes = await fetch('/data/courses');
        const coursesData = await coursesRes.json();
        setCourses(coursesData.data?.slice(0, 3) || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div style={{ paddingTop: '64px' }}>
      {/* Hero Section */}
      <section style={{ 
        minHeight: 'calc(100vh - 64px)',
        display: 'flex',
        alignItems: 'center',
        padding: '80px 0'
      }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <h1 style={{ 
            fontSize: '48px',
            fontWeight: '600',
            lineHeight: '1.2',
            marginBottom: '24px'
          }}>
            Transform Your<br />
            Mind & Body
          </h1>
          <p style={{ 
            fontSize: '20px',
            color: '#666',
            maxWidth: '600px',
            margin: '0 auto 32px',
            lineHeight: '1.6'
          }}>
            Expert-led yoga courses designed for every level. Join thousands on their journey to better health.
          </p>
          <div style={{ 
            display: 'flex',
            gap: '16px',
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}>
            <Link href="/courses" style={{
              display: 'inline-block',
              padding: '12px 32px',
              background: '#000',
              color: '#fff',
              borderRadius: '100px',
              textDecoration: 'none',
              fontWeight: '500',
              fontSize: '16px'
            }}>
              Start Your Journey
            </Link>
            <Link href="#pricing" style={{
              display: 'inline-block',
              padding: '12px 32px',
              background: '#fff',
              color: '#000',
              border: '1px solid #e0e0e0',
              borderRadius: '100px',
              textDecoration: 'none',
              fontWeight: '500',
              fontSize: '16px'
            }}>
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Courses Section */}
      <section style={{ 
        background: '#f8f8f8',
        padding: '80px 0'
      }}>
        <div className="container">
          <h2 style={{
            fontSize: '36px',
            fontWeight: '600',
            textAlign: 'center',
            marginBottom: '16px'
          }}>Popular Courses</h2>
          <p style={{
            fontSize: '16px',
            color: '#666',
            textAlign: 'center',
            marginBottom: '48px'
          }}>Start with our most loved courses</p>
          
          <div style={{ 
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '32px'
          }}>
            {loading ? (
              <>
                {[1, 2, 3].map(i => (
                  <div key={i} style={{
                    background: '#fff',
                    borderRadius: '16px',
                    padding: '32px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                  }}>
                    <div style={{ height: '200px', background: '#f0f0f0', borderRadius: '8px', marginBottom: '16px' }} />
                    <div style={{ height: '20px', background: '#f0f0f0', borderRadius: '4px', marginBottom: '8px' }} />
                    <div style={{ height: '16px', background: '#f0f0f0', borderRadius: '4px', width: '60%' }} />
                  </div>
                ))}
              </>
            ) : (
              <>
                {courses.map((course: { id: string; level: string; duration: string; title: string; description: string; rating: number; totalStudents: number; price: number }) => (
                  <Link key={course.id} href={`/courses/${course.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div style={{
                      background: '#fff',
                      borderRadius: '16px',
                      padding: '32px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                      height: '100%',
                      cursor: 'pointer',
                      transition: 'box-shadow 0.2s',
                    }}>
                      <div style={{ 
                        height: '200px', 
                        background: '#f5f5f5', 
                        borderRadius: '8px', 
                        marginBottom: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '48px',
                        opacity: 0.2
                      }}>
                        🧘‍♀️
                      </div>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                        {course.level} • {course.duration}
                      </div>
                      <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '12px' }}>{course.title}</h3>
                      <p style={{ color: '#666', marginBottom: '20px', lineHeight: '1.6' }}>
                        {course.description}
                      </p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ color: '#FFB800' }}>★</span>
                          <span style={{ fontWeight: '600' }}>{course.rating}</span>
                          <span style={{ color: '#666', fontSize: '14px' }}>({course.totalStudents})</span>
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: '600' }}>${course.price}</div>
                      </div>
                    </div>
                  </Link>
                ))}
              </>
            )}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" style={{ padding: '80px 0' }}>
        <div className="container">
          <h2 style={{
            fontSize: '36px',
            fontWeight: '600',
            textAlign: 'center',
            marginBottom: '16px'
          }}>Simple Pricing</h2>
          <p style={{
            fontSize: '16px',
            color: '#666',
            textAlign: 'center',
            marginBottom: '48px'
          }}>Choose the plan that works for you</p>
          
          <div style={{ 
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '32px',
            maxWidth: '1000px',
            margin: '0 auto'
          }}>
            {/* Free Plan */}
            <div style={{ 
              background: '#fff',
              borderRadius: '16px',
              padding: '40px',
              border: '1px solid #e0e0e0',
              position: 'relative'
            }}>
              <h3 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '24px' }}>Free</h3>
              <div style={{ marginBottom: '32px' }}>
                <span style={{ fontSize: '48px', fontWeight: '600' }}>$0</span>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, marginBottom: '32px' }}>
                <li style={{ padding: '12px 0', display: 'flex', alignItems: 'start', gap: '12px' }}>
                  <span style={{ color: '#00C851' }}>✓</span>
                  <span>Access to free lessons</span>
                </li>
                <li style={{ padding: '12px 0', display: 'flex', alignItems: 'start', gap: '12px' }}>
                  <span style={{ color: '#00C851' }}>✓</span>
                  <span>Basic progress tracking</span>
                </li>
                <li style={{ padding: '12px 0', display: 'flex', alignItems: 'start', gap: '12px' }}>
                  <span style={{ color: '#00C851' }}>✓</span>
                  <span>Community support</span>
                </li>
                <li style={{ padding: '12px 0', display: 'flex', alignItems: 'start', gap: '12px' }}>
                  <span style={{ color: '#00C851' }}>✓</span>
                  <span>Mobile app access</span>
                </li>
              </ul>
              <button style={{
                width: '100%',
                padding: '12px 32px',
                background: '#fff',
                color: '#000',
                border: '1px solid #e0e0e0',
                borderRadius: '100px',
                fontSize: '16px',
                fontWeight: '500',
                cursor: 'pointer'
              }}>
                Get Started
              </button>
            </div>

            {/* Premium Plan */}
            <div style={{ 
              background: '#000',
              color: '#fff',
              borderRadius: '16px',
              padding: '40px',
              position: 'relative',
              transform: 'scale(1.05)'
            }}>
              <div style={{
                position: 'absolute',
                top: '-12px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: '#fff',
                color: '#000',
                padding: '4px 16px',
                borderRadius: '100px',
                fontSize: '12px',
                fontWeight: '600',
                textTransform: 'uppercase'
              }}>
                Most Popular
              </div>
              <h3 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '24px', color: '#fff' }}>Premium</h3>
              <div style={{ marginBottom: '32px' }}>
                <span style={{ fontSize: '48px', fontWeight: '600' }}>$19</span>
                <span style={{ fontSize: '18px', opacity: 0.7 }}>/month</span>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, marginBottom: '32px' }}>
                <li style={{ padding: '12px 0', display: 'flex', alignItems: 'start', gap: '12px' }}>
                  <span>✓</span>
                  <span>All Free features</span>
                </li>
                <li style={{ padding: '12px 0', display: 'flex', alignItems: 'start', gap: '12px' }}>
                  <span>✓</span>
                  <span>Unlimited course access</span>
                </li>
                <li style={{ padding: '12px 0', display: 'flex', alignItems: 'start', gap: '12px' }}>
                  <span>✓</span>
                  <span>Downloadable content</span>
                </li>
                <li style={{ padding: '12px 0', display: 'flex', alignItems: 'start', gap: '12px' }}>
                  <span>✓</span>
                  <span>Priority support</span>
                </li>
                <li style={{ padding: '12px 0', display: 'flex', alignItems: 'start', gap: '12px' }}>
                  <span>✓</span>
                  <span>Certificates of completion</span>
                </li>
                <li style={{ padding: '12px 0', display: 'flex', alignItems: 'start', gap: '12px' }}>
                  <span>✓</span>
                  <span>Advanced analytics</span>
                </li>
              </ul>
              <button style={{ 
                width: '100%',
                padding: '12px 32px',
                background: '#fff',
                color: '#000',
                border: 'none',
                borderRadius: '100px',
                fontSize: '16px',
                fontWeight: '500',
                cursor: 'pointer'
              }}>
                Start Free Trial
              </button>
            </div>

            {/* Lifetime Plan */}
            <div style={{ 
              background: '#fff',
              borderRadius: '16px',
              padding: '40px',
              border: '1px solid #e0e0e0',
              position: 'relative'
            }}>
              <h3 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '24px' }}>Lifetime</h3>
              <div style={{ marginBottom: '32px' }}>
                <span style={{ fontSize: '48px', fontWeight: '600' }}>$299</span>
                <span style={{ fontSize: '18px', opacity: 0.7 }}>one-time</span>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, marginBottom: '32px' }}>
                <li style={{ padding: '12px 0', display: 'flex', alignItems: 'start', gap: '12px' }}>
                  <span style={{ color: '#00C851' }}>✓</span>
                  <span>All Premium features</span>
                </li>
                <li style={{ padding: '12px 0', display: 'flex', alignItems: 'start', gap: '12px' }}>
                  <span style={{ color: '#00C851' }}>✓</span>
                  <span>Lifetime access</span>
                </li>
                <li style={{ padding: '12px 0', display: 'flex', alignItems: 'start', gap: '12px' }}>
                  <span style={{ color: '#00C851' }}>✓</span>
                  <span>Future courses included</span>
                </li>
                <li style={{ padding: '12px 0', display: 'flex', alignItems: 'start', gap: '12px' }}>
                  <span style={{ color: '#00C851' }}>✓</span>
                  <span>1-on-1 sessions (2/year)</span>
                </li>
                <li style={{ padding: '12px 0', display: 'flex', alignItems: 'start', gap: '12px' }}>
                  <span style={{ color: '#00C851' }}>✓</span>
                  <span>Exclusive workshops</span>
                </li>
                <li style={{ padding: '12px 0', display: 'flex', alignItems: 'start', gap: '12px' }}>
                  <span style={{ color: '#00C851' }}>✓</span>
                  <span>Early access to new content</span>
                </li>
              </ul>
              <button style={{
                width: '100%',
                padding: '12px 32px',
                background: '#000',
                color: '#fff',
                border: 'none',
                borderRadius: '100px',
                fontSize: '16px',
                fontWeight: '500',
                cursor: 'pointer'
              }}>
                Get Lifetime Access
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section style={{ 
        background: '#000',
        color: '#fff',
        padding: '80px 0'
      }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <h2 style={{ 
            fontSize: '36px',
            fontWeight: '600',
            color: '#fff',
            marginBottom: '16px'
          }}>Ready to Transform Your Life?</h2>
          <p style={{ 
            fontSize: '20px',
            opacity: 0.8,
            marginBottom: '32px'
          }}>
            Join over 10,000 students already practicing with Yoga-GO
          </p>
          <Link href="/courses" style={{
            display: 'inline-block',
            padding: '12px 32px',
            background: '#fff',
            color: '#000',
            borderRadius: '100px',
            textDecoration: 'none',
            fontWeight: '500',
            fontSize: '16px'
          }}>
            Start Your Free Trial
          </Link>
        </div>
      </section>
    </div>
  );
}