# frozen_string_literal: true

require "spec_helper"

RSpec.describe Broadlistening::Viewer do
  describe ".js_path" do
    it "points to an existing directory" do
      expect(Dir.exist?(described_class.js_path)).to be true
    end
  end

  describe ".assets_path" do
    it "points to an existing directory" do
      expect(Dir.exist?(described_class.assets_path)).to be true
    end
  end
end
