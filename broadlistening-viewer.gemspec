# frozen_string_literal: true

require_relative "lib/broadlistening/viewer/version"

Gem::Specification.new do |spec|
  spec.name = "broadlistening-viewer"
  spec.version = Broadlistening::Viewer::VERSION
  spec.authors = ["takahashim"]
  spec.email = ["takahashimm@gmail.com"]

  spec.summary = "Standalone viewer for Broadlistening analysis results"
  spec.description = "Generates interactive HTML visualizations from Broadlistening JSON output"
  spec.homepage = "https://github.com/takahashim/broadlistening-ruby-viewer"
  spec.license = "AGPL-3.0-only"
  spec.required_ruby_version = ">= 3.2.0"

  spec.metadata["homepage_uri"] = spec.homepage
  spec.metadata["source_code_uri"] = spec.homepage
  spec.metadata["rubygems_mfa_required"] = "true"

  spec.files = Dir["lib/**/*", "js/shared/**/*", "exe/*", "LICENSE", "README.md"]
  spec.bindir = "exe"
  spec.executables = ["broadlistening-viewer"]
  spec.require_paths = ["lib"]
end
