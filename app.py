from flask import Flask,send_from_directory, jsonify

app = Flask(__name__)
STATUS = "Standby"
@app.route("/")
def home():
  return send_from_directory("frontend", "index.html")
  
  

@app.route("/status/")
def status():
  return STATUS
  
if __name__ == "__main__":
    app.run(debug=True)