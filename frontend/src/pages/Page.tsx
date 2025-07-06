"use client"

import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Zap, BarChart3, Shield, Clock, Users, Target, ArrowRight, CheckCircle, Github } from "lucide-react"

interface HomePageProps {
  onNavigateAuth: () => void;
}

export default function HomePage({ onNavigateAuth }: HomePageProps) {
  return (
    <div className="min-h-screen bg-black text-white font-sans font-light">
      <header className="border-b border-white/10 bg-black">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Zap className="h-8 w-8 text-white" />
            <span className="text-2xl font-extralight text-white tracking-tight">LoadTest</span>
          </div>
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-white hover:text-gray-300 transition-colors font-light">
              <span className="text-white font-extralight">Features</span>
            </a>
            <a href="#demo" className="text-white hover:text-gray-300 transition-colors font-light">
              <span className="text-white font-extralight">Demo</span>
            </a>
            <a href="#docs" className="text-white hover:text-gray-300 transition-colors font-light">
              <span className="text-white font-extralight">Docs</span>
            </a>
            <button 
              onClick={onNavigateAuth}
              className="bg-white text-black hover:bg-gray-200 transition-colors font-extralight py-2 px-4 rounded-none border border-white/10"
            >
              <span className="text-black font-extralight">Login</span>
            </button>
          </nav>
        </div>
      </header>

      <main>
        <section className="py-20 px-4">
          <div className="container mx-auto text-center max-w-4xl">
            <div className="mb-4 bg-black text-gray-300 border border-white/10 rounded-none px-3 py-1 text-sm font-light inline-block">
              Open Source Load Testing
            </div>
            <h1 className="text-5xl md:text-6xl font-extralight text-white mb-6 leading-tight tracking-tight">
              Simple Load Testing
              <span className="text-white block">For Developers</span>
            </h1>
            <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto font-light">
              A lightweight, developer-friendly tool to test your application's performance. No complex setup, no
              subscriptions - just straightforward load testing.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="text-lg px-8 py-3 bg-white text-black hover:bg-gray-200 font-extralight rounded-none transition-all duration-200 flex items-center justify-center space-x-2 border border-white/10">
                <span className="text-white font-extralight">Get Started</span>
                <ArrowRight className="ml-2 h-5 w-5 text-white" />
              </button>
              <button className="text-lg px-8 py-3 bg-black text-white hover:bg-neutral-800 border border-white/10 font-extralight rounded-none transition-all duration-200">
                <span className="text-white font-extralight">Try Demo</span>
              </button>
            </div>
            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
              <div>
                <div className="text-3xl font-extralight text-white">Free</div>
                <div className="text-gray-400 font-light">Always</div>
              </div>
              <div>
                <div className="text-3xl font-extralight text-white">5K+</div>
                <div className="text-gray-400 font-light">Concurrent Users</div>
              </div>
              <div>
                <div className="text-3xl font-extralight text-white">{"<"}30s</div>
                <div className="text-gray-400 font-light">Setup Time</div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="py-20 px-4 bg-black border-t border-white/10">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-extralight text-white mb-4 tracking-tight">Built for Simplicity</h2>
              <p className="text-xl text-gray-400 max-w-2xl mx-auto font-light">
                Everything you need to load test your applications without the complexity of enterprise tools.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="border border-white/10 bg-black hover:border-white/20 transition-colors rounded-none p-6">
                <BarChart3 className="h-12 w-12 text-white mb-4" />
                <h3 className="text-white font-extralight text-lg mb-2">Real-time Metrics</h3>
                <p className="text-gray-400 font-light text-sm">
                  Watch response times and throughput as your tests run
                </p>
              </div>

              <div className="border border-white/10 bg-black hover:border-white/20 transition-colors rounded-none p-6">
                <Users className="h-12 w-12 text-white mb-4" />
                <h3 className="text-white font-extralight text-lg mb-2">Concurrent Testing</h3>
                <p className="text-gray-400 font-light text-sm">
                  Simulate thousands of users hitting your endpoints simultaneously
                </p>
              </div>

              <div className="border border-white/10 bg-black hover:border-white/20 transition-colors rounded-none p-6">
                <Target className="h-12 w-12 text-white mb-4" />
                <h3 className="text-white font-extralight text-lg mb-2">Custom Scenarios</h3>
                <p className="text-gray-400 font-light text-sm">
                  Define complex user flows with simple configuration
                </p>
              </div>

              <div className="border border-white/10 bg-black hover:border-white/20 transition-colors rounded-none p-6">
                <Shield className="h-12 w-12 text-white mb-4" />
                <h3 className="text-white font-extralight text-lg mb-2">Local & Remote</h3>
                <p className="text-gray-400 font-light text-sm">
                  Run tests locally or deploy to test from multiple regions
                </p>
              </div>

              <div className="border border-white/10 bg-black hover:border-white/20 transition-colors rounded-none p-6">
                <Clock className="h-12 w-12 text-white mb-4" />
                <h3 className="text-white font-extralight text-lg mb-2">Quick Setup</h3>
                <p className="text-gray-400 font-light text-sm">
                  Get running in minutes with minimal configuration
                </p>
              </div>

              <div className="border border-white/10 bg-black hover:border-white/20 transition-colors rounded-none p-6">
                <Zap className="h-12 w-12 text-white mb-4" />
                <h3 className="text-white font-extralight text-lg mb-2">Export Results</h3>
                <p className="text-gray-400 font-light text-sm">
                  Save and share detailed performance reports
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 px-4 bg-black border-t border-white/10">
          <div className="container mx-auto max-w-4xl text-center">
            <h2 className="text-4xl font-extralight mb-6 text-white tracking-tight">Ready to Test Your App?</h2>
            <p className="text-xl text-gray-400 mb-8 font-light">
              A straightforward load testing tool built by developers, for developers. No accounts, no limits, no
              hassle.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-6 w-6 text-white flex-shrink-0" />
                <span className="text-gray-300 font-light">Completely free</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-6 w-6 text-white flex-shrink-0" />
                <span className="text-gray-300 font-light">Open source</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-6 w-6 text-white flex-shrink-0" />
                <span className="text-gray-300 font-light">No registration required</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-6 w-6 text-white flex-shrink-0" />
                <span className="text-gray-300 font-light">Self-hosted option</span>
              </div>
            </div>

            <button className="bg-white text-black hover:bg-gray-200 font-extralight text-lg px-8 py-3 rounded-none transition-all duration-200 flex items-center justify-center space-x-2 mx-auto border border-white/10">
              <span className="text-white font-extralight">Start Load Testing</span>
              <ArrowRight className="ml-2 h-5 w-5 text-white" />
            </button>
          </div>
        </section>
      </main>

      <footer className="bg-black border-t border-white/10 py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Zap className="h-6 w-6 text-white" />
                <span className="text-xl font-extralight text-white tracking-tight">LoadTest</span>
              </div>
              <p className="text-gray-400 font-light">Simple, effective load testing for modern applications.</p>
            </div>

            <div>
              <h3 className="font-extralight text-white mb-4">Tool</h3>
              <ul className="space-y-2 text-gray-400 font-light">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Demo
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Download
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    CLI
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-extralight text-white mb-4">Resources</h3>
              <ul className="space-y-2 text-gray-400 font-light">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Documentation
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Examples
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    GitHub
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Issues
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-extralight text-white mb-4">Project</h3>
              <ul className="space-y-2 text-gray-400 font-light">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    About
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Contributing
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    License
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Changelog
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 mt-8 pt-8 text-center text-gray-400 font-light">
            <p>&copy; {new Date().getFullYear()} LoadTest. Open source project.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
