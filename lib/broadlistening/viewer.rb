# frozen_string_literal: true

require_relative "viewer/version"
require_relative "viewer/renderer"

module Broadlistening
  module Viewer
    def self.root
      File.expand_path("../..", __dir__)
    end

    def self.js_path
      File.join(root, "js")
    end

    def self.assets_path
      File.join(root, "lib", "broadlistening", "viewer", "assets")
    end
  end
end
